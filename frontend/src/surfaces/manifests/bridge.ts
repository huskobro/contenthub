/**
 * Bridge Surface — "Operations Command Center" (Variant B) — DISABLED PLACEHOLDER.
 *
 * Faz 1 — Infrastructure only. See `manifests/legacy.ts` for the
 * circular-import rationale; this module exports metadata only.
 */

import type { SurfaceManifest } from "../contract";

export const BRIDGE_MANIFEST: SurfaceManifest = {
  id: "bridge",
  name: "Bridge",
  tagline: "Operations Command Center — boru hatti oncelikli, yogun bilgi.",
  description:
    "Bridge, job/pipeline/publish durumunu bir komut merkezi gibi gosteren operasyon " +
    "odakli varyanttir. Faz 1'de yalnizca kayit seviyesinde mevcuttur ve secilmesi durumunda " +
    "resolver Legacy'ye geri duser. Gercek kabuk Faz 2'de yazilacaktir.",
  author: "system",
  version: "0.0.0",
  scope: "both",
  status: "disabled",
  coverage: "full",
  density: "compact",
  tone: ["operations", "dense", "command"],
  hidden: false,
};
