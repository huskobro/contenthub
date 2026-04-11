/**
 * Canvas Surface — "Creator Workspace Pro" (Variant C)
 *
 * Faz 1: registered as a disabled placeholder.
 * Faz 3: promoted to beta, user-scope only, with a real workspace shell and
 *        page overrides wired in `manifests/register.tsx`.
 *
 * Canvas is the first visibly-new user-facing surface. It presents the
 * content-production experience as a project-centric workspace: the sidebar
 * enumerates projects, the dashboard surfaces active work and previews, and
 * project detail becomes a "home base" rather than a shallow status page.
 *
 * Scope is intentionally `user` — Bridge already owns the admin command
 * center. Canvas must never hijack admin panels.
 *
 * Metadata-only export — layout/page bindings live in the bootstrap module so
 * this file never triggers circular imports into ThemeProvider.
 */

import type { SurfaceManifest } from "../contract";

export const CANVAS_MANIFEST: SurfaceManifest = {
  id: "canvas",
  name: "Canvas",
  tagline: "Creator Workspace Pro — proje merkezli, on izleme oncelikli yaratici akis.",
  description:
    "Canvas, icerik uretimini bir yaratici atolyesi gibi gosteren kullanici odakli " +
    "varyanttir. User scope'unda calisir ve `ui.surface.canvas.enabled` ayari " +
    "acikken + Surface Registry kill switch'i acikken devreye girer. User " +
    "dashboard, projelerim ve proje detayi sayfalarini workspace diliyle yeniden " +
    "yorumlar; override edilmeyen sayfalar (ornegin kanallar, ayarlar) legacy " +
    "arayuzle acilmaya devam eder. Admin panelini hicbir sekilde etkilemez.",
  author: "system",
  version: "0.1.0",
  // Faz 5: Canvas artık hem admin hem user paneli için çalışır. User tarafı
  // workspace sidebar + header layout'unu korur, admin tarafı aynı görsel
  // dil üzerinde zone-gruplu admin nav ile çalışır.
  scope: "both",
  status: "beta",
  coverage: "full",
  density: "spacious",
  navigation: {
    primary: "sidebar",
    secondary: "workspace-header",
    ownsCommandPalette: false,
  },
  tone: ["creative", "preview-first", "studio", "workspace"],
  bestFor: [
    "Proje merkezli yaratici akis",
    "On izleme oncelikli calisma",
    "Kullanici paneli icin gunluk icerik uretimi",
  ],
  hidden: false,
};
