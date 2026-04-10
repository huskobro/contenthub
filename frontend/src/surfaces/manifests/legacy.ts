/**
 * Legacy Surface manifest — metadata only.
 *
 * Faz 1 — Infrastructure only.
 *
 * This module intentionally does NOT import the layout components. Doing so
 * would create a circular-import chain:
 *   AdminLayout → ThemeProvider → surfaces → manifests/legacy → AdminLayout
 * which leaves AdminLayout `undefined` at registration time.
 *
 * Instead, layout bindings are attached by `manifests/register.ts`, which is
 * loaded only from DynamicAdminLayout / DynamicUserLayout — both of which
 * are top-level router entries, NOT children of ThemeProvider. That module
 * loads AFTER the layout modules have finished evaluating and is therefore
 * safe to import AdminLayout / UserLayout directly.
 */

import type { SurfaceManifest } from "../contract";

export const LEGACY_MANIFEST: SurfaceManifest = {
  id: "legacy",
  name: "Legacy",
  tagline: "ContentHub'un klasik yonetici ve kullanici arayuzu.",
  description:
    "Klasik sidebar + topbar kabugu. ContentHub'un tum modulleri ilk olarak bu arayuz ustunde gelistirildi. " +
    "Legacy her zaman aktiftir ve diger yuzeyler icin son donus noktasidir.",
  author: "system",
  version: "1.0.0",
  scope: "both",
  status: "stable",
  coverage: "full",
  density: "comfortable",
  navigation: { primary: "sidebar", secondary: "topbar", ownsCommandPalette: true },
  tone: ["classic", "operations", "default"],
  bestFor: [
    "Klasik ContentHub deneyimi",
    "En saglam, en uzun test edilmis yuzey",
    "Fallback / acil durum sigici",
  ],
  hidden: false,
};
