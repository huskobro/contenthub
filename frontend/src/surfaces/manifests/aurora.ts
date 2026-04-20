/**
 * Aurora Surface — "Aurora Dusk Cockpit"
 *
 * 6. surface: Claude Design'dan ("Aurora Dusk v2.4.1") alınan kokpit paradigması.
 *   - 4 katmanlı şell: ctxbar (48px) + rail (56px) + workbench + inspector (340px) + statusbar (28px)
 *   - Geist / Geist Mono tipografi, plum + teal accent, dark-first tema
 *   - Preview-first primitives: QuickLook, Drawer, MediaPreview
 *
 * Tasarım, CSS seviyesinde `[data-surface="aurora"]` altına scope'lanmıştır;
 * legacy/horizon/atrium/bridge/canvas ile çakışmaz. Runtime'da Aurora aktif
 * olduğunda `AuroraAdminLayout` veya `AuroraUserLayout` Cockpit Shell'i
 * mount eder. Override edilmemiş sayfalar `<Outlet />` ile legacy rotaya
 * düşer — böylece ilk sürümde eksik sayfalar kırılmaz.
 *
 * Metadata-only export — layout bindings `manifests/register.tsx`'te.
 */

import type { SurfaceManifest } from "../contract";

export const AURORA_MANIFEST: SurfaceManifest = {
  id: "aurora",
  name: "Aurora",
  tagline: "Aurora Dusk Cockpit — ön izleme-öncelikli, premium operasyon kabuğu.",
  description:
    "Aurora, 'Aurora Dusk' tasarım sisteminden türeyen altıncı yüzey varyantıdır. " +
    "Dört katmanlı kokpit geometrisi (context bar, 56px icon-only rail, workbench, " +
    "sağ inspector drawer, canlı status bar) bir operasyon merkezi gibi davranır: " +
    "job/render/publish durumunu sürekli gösterir, QuickLook ve MediaPreview gibi " +
    "önizleme primitifleriyle görsel kararları körlemeden almayı mümkün kılar. " +
    "Hem admin hem user panelinde çalışır; override edilmemiş sayfalar legacy'ye " +
    "geri düşer.",
  author: "system",
  version: "0.1.0",
  scope: "both",
  status: "beta",
  coverage: "full",
  density: "compact",
  navigation: {
    primary: "rail",
    secondary: "context-panel",
    ownsCommandPalette: false,
  },
  tone: ["premium", "operations", "preview-first", "dark-first"],
  bestFor: [
    "Canlı render kuyruğu + job izleme",
    "Önizleme-öncelikli üretim akışı",
    "Premium operasyon kokpiti hissi",
  ],
  hidden: false,
};
