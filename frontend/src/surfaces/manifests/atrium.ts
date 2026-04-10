/**
 * Atrium Surface — "Premium Media OS" (Variant A).
 *
 * Faz 1: registered as a disabled placeholder.
 * Faz 4: promoted to beta, user-scope only, with a real editorial shell and
 *        three page overrides wired in `manifests/register.tsx`.
 *
 * Atrium is the second visibly-new user-facing surface (after Canvas). Where
 * Canvas feels like a creator workspace, Atrium feels like a premium media
 * studio / editorial magazine:
 *
 *   - sinematik hero bantlari
 *   - gorsel hiyerarsi agirlikli, showcase benzeri bloklar
 *   - proje merkezli ama "yayinlanmak uzere parlatilan" hissi
 *   - header'da command palette gizli, editorial blok tabanli gezinme
 *
 * Scope is intentionally `user`. Bridge already owns admin command ops, so
 * Atrium must never hijack the admin panel. Canvas stays in place as the
 * "workspace" alternative; Atrium and Canvas co-exist as two user surfaces
 * the admin can select per role/tenant.
 *
 * Metadata-only export — layout/page bindings live in the bootstrap module
 * so this file never triggers circular imports into ThemeProvider.
 */

import type { SurfaceManifest } from "../contract";

export const ATRIUM_MANIFEST: SurfaceManifest = {
  id: "atrium",
  name: "Atrium",
  tagline: "Premium Media OS — sinematik, editorial, showcase hissi.",
  description:
    "Atrium, ContentHub'u bir premium medya isletim sistemi gibi gosteren " +
    "kullanici odakli varyanttir. User scope'unda calisir ve " +
    "`ui.surface.atrium.enabled` ayari acikken + Surface Registry kill " +
    "switch'i acikken devreye girer. User dashboard, projelerim ve proje " +
    "detayi sayfalarini sinematik editorial diliyle yeniden yorumlar; " +
    "override edilmeyen sayfalar legacy/canvas fallback mantigiyla " +
    "acilmaya devam eder. Admin panelini hicbir sekilde etkilemez.",
  author: "system",
  version: "0.1.0",
  scope: "user",
  status: "beta",
  coverage: "full",
  density: "spacious",
  navigation: {
    primary: "top-nav",
    secondary: "editorial-strip",
    ownsCommandPalette: false,
  },
  tone: ["premium", "cinematic", "editorial", "showcase"],
  hidden: false,
};
