/**
 * Horizon Surface manifest — metadata only.
 *
 * Faz 1 — Infrastructure only.
 *
 * See `manifests/legacy.ts` for the circular-import rationale. Layout
 * bindings for horizon are attached in `manifests/register.ts`.
 */

import type { SurfaceManifest } from "../contract";

export const HORIZON_MANIFEST: SurfaceManifest = {
  id: "horizon",
  name: "Horizon",
  tagline: "Ikon raylari ve baglam paneli ile modern dikey akis.",
  description:
    "Horizon, dar ikon rayi + geniş ana alan + sag taraf baglam paneli ile daha sakin, " +
    "modern bir yonetim deneyimi sunar. Wave 2'den beri mevcuttur ve Surface Registry " +
    "tarafindan degistirilmeden sarilir.",
  author: "system",
  version: "1.0.0",
  scope: "both",
  status: "stable",
  coverage: "full",
  density: "comfortable",
  navigation: { primary: "rail", secondary: "context-panel", ownsCommandPalette: true },
  tone: ["modern", "calm", "focused"],
  hidden: false,
};
