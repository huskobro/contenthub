/**
 * Bridge Surface — "Operations Command Center" (Variant B)
 *
 * Faz 1: registered as a disabled placeholder.
 * Faz 2: promoted to beta, admin-scope only, with real shell + page overrides
 *        wired in `manifests/register.tsx`.
 *
 * Metadata-only export — layout/page bindings live in the bootstrap module so
 * this file never triggers circular imports into admin layout components.
 */

import type { SurfaceManifest } from "../contract";

export const BRIDGE_MANIFEST: SurfaceManifest = {
  id: "bridge",
  name: "Bridge",
  tagline: "Operations Command Center — boru hatti oncelikli, yogun bilgi.",
  description:
    "Bridge, job/pipeline/publish durumunu bir komut merkezi gibi gosteren operasyon " +
    "odakli varyanttir. Admin scope'unda calisir ve `ui.surface.bridge.enabled` " +
    "ayari acikken + Surface Registry kill switch'i acikken devreye girer. Override " +
    "edilmeyen sayfalar legacy'ye geri duser, yani yayin detayi / ayarlar / analytics " +
    "gibi sayfalar eski arayuzle acilmaya devam eder.",
  author: "system",
  version: "0.1.0",
  scope: "admin",
  status: "beta",
  coverage: "full",
  density: "compact",
  navigation: {
    primary: "rail",
    secondary: "context-panel",
    ownsCommandPalette: false,
  },
  tone: ["operations", "dense", "command"],
  hidden: false,
};
