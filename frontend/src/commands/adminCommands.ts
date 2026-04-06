/**
 * Admin Command Registry — Wave 2 / M25
 *
 * Real navigation and action commands for the command palette.
 * Every command here corresponds to an actual route or action.
 * No fake, decorative, or placeholder commands.
 */

import type { Command } from "../stores/commandPaletteStore";

/**
 * Build admin navigation commands.
 * Requires a navigate function (from react-router) to avoid importing router directly.
 */
export function buildAdminNavigationCommands(navigate: (path: string) => void): Command[] {
  return [
    // -- Genel --
    {
      id: "nav:admin-overview",
      label: "Genel Bakis",
      category: "navigation",
      icon: "🏠",
      description: "Admin ana sayfasi",
      keywords: ["dashboard", "home", "anasayfa", "genel"],
      action: () => navigate("/admin"),
    },

    // -- Sistem --
    {
      id: "nav:admin-settings",
      label: "Ayarlar",
      category: "navigation",
      icon: "⚙️",
      description: "Sistem ayarlari",
      keywords: ["settings", "config", "yapilandirma"],
      visibilityKey: "panel:settings",
      action: () => navigate("/admin/settings"),
    },
    {
      id: "nav:admin-visibility",
      label: "Gorunurluk Yonetimi",
      category: "navigation",
      icon: "👁️",
      description: "Alan ve panel gorunurluk kurallari",
      keywords: ["visibility", "gorunurluk", "izin"],
      visibilityKey: "panel:visibility",
      action: () => navigate("/admin/visibility"),
    },
    {
      id: "nav:admin-jobs",
      label: "Isler",
      category: "navigation",
      icon: "📋",
      description: "Is kuyrugu ve durumu",
      keywords: ["jobs", "queue", "isler", "kuyruk"],
      action: () => navigate("/admin/jobs"),
    },
    {
      id: "nav:admin-audit",
      label: "Audit Log",
      category: "navigation",
      icon: "📜",
      description: "Denetim kayitlari",
      keywords: ["audit", "log", "denetim", "kayit"],
      action: () => navigate("/admin/audit-logs"),
    },

    // -- Icerik Uretimi --
    {
      id: "nav:admin-library",
      label: "Icerik Kutuphanesi",
      category: "navigation",
      icon: "📚",
      description: "Tum icerikler",
      keywords: ["content", "library", "icerik", "kutuphane"],
      action: () => navigate("/admin/library"),
    },
    {
      id: "nav:admin-assets",
      label: "Varlik Kutuphanesi",
      category: "navigation",
      icon: "🖼️",
      description: "Gorseller, videolar, dosyalar",
      keywords: ["asset", "media", "gorsel", "dosya", "varlik"],
      action: () => navigate("/admin/assets"),
    },
    {
      id: "nav:admin-standard-videos",
      label: "Standart Video",
      category: "navigation",
      icon: "🎬",
      description: "Standart video kayitlari",
      keywords: ["video", "standart"],
      action: () => navigate("/admin/standard-videos"),
    },
    {
      id: "nav:admin-templates",
      label: "Sablonlar",
      category: "navigation",
      icon: "📄",
      description: "Icerik sablonlari",
      keywords: ["template", "sablon"],
      visibilityKey: "panel:templates",
      action: () => navigate("/admin/templates"),
    },
    {
      id: "nav:admin-style-blueprints",
      label: "Stil Sablonlari",
      category: "navigation",
      icon: "🎨",
      description: "Gorsel stil tanimlari",
      keywords: ["style", "blueprint", "stil", "gorsel"],
      action: () => navigate("/admin/style-blueprints"),
    },
    {
      id: "nav:admin-template-style-links",
      label: "Sablon-Stil Baglantilari",
      category: "navigation",
      icon: "🔗",
      description: "Sablon ve stil eslestirmeleri",
      keywords: ["link", "baglanti", "eslestirme"],
      action: () => navigate("/admin/template-style-links"),
    },

    // -- Analytics --
    {
      id: "nav:admin-analytics",
      label: "Analytics",
      category: "navigation",
      icon: "📊",
      description: "Platform istatistikleri",
      keywords: ["analytics", "istatistik", "rapor"],
      visibilityKey: "panel:analytics",
      action: () => navigate("/admin/analytics"),
    },
    {
      id: "nav:admin-analytics-content",
      label: "Icerik Analytics",
      category: "navigation",
      icon: "📈",
      description: "Icerik bazli istatistikler",
      keywords: ["content", "analytics", "icerik"],
      visibilityKey: "panel:analytics",
      action: () => navigate("/admin/analytics/content"),
    },
    {
      id: "nav:admin-analytics-operations",
      label: "Operasyon Analytics",
      category: "navigation",
      icon: "📉",
      description: "Operasyonel metrikler",
      keywords: ["operations", "operasyon", "metrik"],
      visibilityKey: "panel:analytics",
      action: () => navigate("/admin/analytics/operations"),
    },
    {
      id: "nav:admin-youtube-analytics",
      label: "YouTube Analytics",
      category: "navigation",
      icon: "▶️",
      description: "YouTube platform istatistikleri",
      keywords: ["youtube", "video", "platform"],
      action: () => navigate("/admin/analytics/youtube"),
    },

    // -- Haber --
    {
      id: "nav:admin-sources",
      label: "Kaynaklar",
      category: "navigation",
      icon: "📡",
      description: "Haber kaynaklari",
      keywords: ["source", "kaynak", "haber"],
      visibilityKey: "panel:sources",
      action: () => navigate("/admin/sources"),
    },
    {
      id: "nav:admin-source-scans",
      label: "Kaynak Taramalari",
      category: "navigation",
      icon: "🔍",
      description: "Otomatik ve manuel taramalar",
      keywords: ["scan", "tarama", "kaynak"],
      action: () => navigate("/admin/source-scans"),
    },
    {
      id: "nav:admin-news-bulletins",
      label: "Haber Bultenleri",
      category: "navigation",
      icon: "📰",
      description: "Haber bulten kayitlari",
      keywords: ["bulletin", "bulten", "haber"],
      action: () => navigate("/admin/news-bulletins"),
    },
    {
      id: "nav:admin-news-items",
      label: "Haber Ogeler",
      category: "navigation",
      icon: "📝",
      description: "Bireysel haber kayitlari",
      keywords: ["news", "item", "haber", "oge"],
      action: () => navigate("/admin/news-items"),
    },
    {
      id: "nav:admin-used-news",
      label: "Kullanilan Haberler",
      category: "navigation",
      icon: "✅",
      description: "Kullanilmis haber kayıt defteri",
      keywords: ["used", "news", "kullanilan", "dedupe"],
      action: () => navigate("/admin/used-news"),
    },

    // -- Gorunum --
    {
      id: "nav:admin-themes",
      label: "Tema Yonetimi",
      category: "navigation",
      icon: "🎨",
      description: "Tema secimi ve iceaktarimi",
      keywords: ["theme", "tema", "gorunum", "renk"],
      action: () => navigate("/admin/themes"),
    },

    // -- Wizard'lar --
    {
      id: "nav:admin-video-wizard",
      label: "Video Olusturma Wizard'i",
      category: "navigation",
      icon: "🧙",
      description: "Adim adim rehberli video olusturma",
      keywords: ["wizard", "sihirbaz", "rehber", "guided", "video", "olustur"],
      action: () => navigate("/admin/standard-videos/wizard"),
    },
    {
      id: "nav:admin-onboarding",
      label: "Onboarding Wizard'i",
      category: "navigation",
      icon: "🚀",
      description: "Sistem kurulum sihirbazini yeniden calistir",
      keywords: ["onboarding", "kurulum", "wizard", "sihirbaz", "baslangic", "setup"],
      action: () => navigate("/onboarding?force=true"),
    },
  ];
}

/**
 * Build admin quick-create commands.
 */
export function buildAdminActionCommands(navigate: (path: string) => void): Command[] {
  return [
    {
      id: "action:create-standard-video",
      label: "Yeni Standart Video",
      category: "action",
      icon: "➕",
      description: "Yeni standart video olustur (hizli form)",
      keywords: ["create", "new", "yeni", "video", "olustur", "hizli"],
      action: () => navigate("/admin/standard-videos/new"),
    },
    {
      id: "action:create-standard-video-wizard",
      label: "Wizard ile Video Olustur",
      category: "action",
      icon: "🧙",
      description: "Adim adim rehberli video olusturma wizard'i",
      keywords: ["create", "new", "yeni", "video", "wizard", "sihirbaz", "rehber", "guided"],
      action: () => navigate("/admin/standard-videos/wizard"),
    },
    {
      id: "action:create-template",
      label: "Yeni Sablon",
      category: "action",
      icon: "➕",
      description: "Yeni icerik sablonu olustur",
      keywords: ["create", "new", "yeni", "sablon", "template"],
      visibilityKey: "panel:templates",
      action: () => navigate("/admin/templates/new"),
    },
    {
      id: "action:create-style-blueprint",
      label: "Yeni Stil Sablonu",
      category: "action",
      icon: "➕",
      description: "Yeni stil sablonu olustur",
      keywords: ["create", "new", "yeni", "stil", "blueprint"],
      action: () => navigate("/admin/style-blueprints/new"),
    },
    {
      id: "action:create-source",
      label: "Yeni Kaynak",
      category: "action",
      icon: "➕",
      description: "Yeni haber kaynagi ekle",
      keywords: ["create", "new", "yeni", "kaynak", "source"],
      visibilityKey: "panel:sources",
      action: () => navigate("/admin/sources/new"),
    },
    {
      id: "action:create-source-scan",
      label: "Yeni Kaynak Taramasi",
      category: "action",
      icon: "➕",
      description: "Yeni kaynak taramasi baslat",
      keywords: ["create", "new", "yeni", "tarama", "scan"],
      action: () => navigate("/admin/source-scans/new"),
    },
    {
      id: "action:create-news-bulletin",
      label: "Yeni Haber Bulteni",
      category: "action",
      icon: "➕",
      description: "Yeni haber bulteni olustur",
      keywords: ["create", "new", "yeni", "bulten", "bulletin"],
      action: () => navigate("/admin/news-bulletins/new"),
    },
    {
      id: "action:create-news-item",
      label: "Yeni Haber Oge",
      category: "action",
      icon: "➕",
      description: "Yeni haber ogesi ekle",
      keywords: ["create", "new", "yeni", "haber", "news"],
      action: () => navigate("/admin/news-items/new"),
    },
    {
      id: "action:create-used-news",
      label: "Yeni Kullanilan Haber",
      category: "action",
      icon: "➕",
      description: "Kullanilmis haber kaydi ekle",
      keywords: ["create", "new", "yeni", "kullanilan"],
      action: () => navigate("/admin/used-news/new"),
    },
    {
      id: "action:create-template-style-link",
      label: "Yeni Sablon-Stil Baglantisi",
      category: "action",
      icon: "➕",
      description: "Sablon ve stil eslestirmesi olustur",
      keywords: ["create", "new", "yeni", "baglanti", "link"],
      action: () => navigate("/admin/template-style-links/new"),
    },
  ];
}
