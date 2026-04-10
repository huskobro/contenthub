/**
 * Atrium Surface — "Premium Media OS" (Variant A) — DISABLED PLACEHOLDER.
 *
 * Faz 1 — Infrastructure only.
 *
 * Atrium is registered as a DISABLED surface in Faz 1. This means:
 * - It exists in the registry so settings/switchers can enumerate it.
 * - It has NO adminLayout / userLayout bindings.
 * - The resolver will never pick it; any attempt falls back to legacy.
 *
 * The real implementation belongs to a later phase (Faz 3+).
 */

import type { SurfaceManifest } from "../contract";

export const ATRIUM_MANIFEST: SurfaceManifest = {
  id: "atrium",
  name: "Atrium",
  tagline: "Premium Media OS — sinematik, yoguṅ, üretim stüdyosu hissi.",
  description:
    "Atrium, ContentHub'u bir premium medya isletim sistemi gibi gosteren varyanttir. " +
    "Faz 1'de yalnizca kayit seviyesinde mevcuttur; gercek kabuk daha sonra eklenecektir. " +
    "Secilmesi durumunda resolver, Legacy yuzeyine geri duser.",
  author: "system",
  version: "0.0.0",
  scope: "both",
  status: "disabled",
  coverage: "full",
  density: "comfortable",
  tone: ["premium", "cinematic", "studio"],
  hidden: false,
};
