/**
 * Remotion composition kayıt kökü — M6-C3.
 *
 * Tüm composition'lar burada kayıt edilir.
 * Güvenli composition mapping kuralı: yeni composition eklemek için
 * bu dosyaya açık kayıt yapılmalı ve composition_map.py ile senkronize tutulmalıdır.
 *
 * Mevcut composition'lar (composition_map.py ile senkron — M6-C3, M28):
 *   StandardVideo     — standard_video modülü için (final render)
 *                       composition_map.COMPOSITION_MAP["standard_video"]
 *   NewsBulletin      — news_bulletin modülü için (combined render, M28)
 *                       composition_map.COMPOSITION_MAP["news_bulletin"]
 *   PreviewFrame      — renderStill preview için (final render'dan ayrı)
 *                       composition_map.PREVIEW_COMPOSITION_MAP["standard_video_preview"]
 *
 * Dynamic duration (M6-C2, M6-C3 fallback belgesi):
 *   Authoritative kaynak: render_props.json → total_duration_seconds
 *   Üretici: backend CompositionStepExecutor
 *   Fallback: total_duration_seconds eksik/sıfır/negatif → 60 saniye.
 *   Backend tarafı bu durumu WARNING log + duration_fallback_used=true ile bildirir.
 *   Renderer tarafı: props null/undefined → 60 saniye (console.warn ile bildirilir).
 *   Sessiz fallback yok: hem backend hem renderer fallback durumu loglar.
 *
 * as unknown cast (M6-C3 audit):
 *   Bu dosyada 5 gerçek cast var (2 component + 2 defaultProps + 1 calculateMetadata).
 *   Remotion v4 Zod-less kayıt için gerekli sınırlama — yayılmamalı.
 *   Yeni composition eklemek 2 cast daha gerektirir (component + defaultProps).
 *   Bu sayı artarsa alarm verilmeli.
 *
 * Zod şema kullanılmaz — props doğrudan TypeScript tipi ile tanımlanır.
 */

import React from "react";
import { Composition, registerRoot } from "remotion";
import {
  StandardVideoComposition,
  type StandardVideoProps,
} from "./compositions/StandardVideoComposition";
import {
  PreviewFrameComposition,
  type PreviewFrameProps,
} from "./compositions/PreviewFrameComposition";
import {
  NewsBulletinComposition,
  defaultNewsBulletinProps,
  type NewsBulletinProps,
} from "./compositions/NewsBulletinComposition";
import {
  NewsBulletinStyleTestComposition,
  TEST_PROPS,
} from "./compositions/NewsBulletinStyleTest";
import type { BulletinStyle } from "./templates/news-bulletin/components/StudioBackground";
import {
  ProductReviewComposition,
  type ProductReviewProps,
} from "./compositions/ProductReviewComposition";
import {
  ProductReviewPreviewFrame,
  type ProductReviewPreviewFrameProps,
} from "./compositions/ProductReviewPreviewFrame";
import {
  ProductReviewMini,
  type ProductReviewMiniProps,
} from "./compositions/ProductReviewMini";

const FPS = 60;

// Remotion v4: Zod kullanılmayan kayıtlar için ComponentType cast.
const StandardVideoComponent =
  StandardVideoComposition as unknown as React.ComponentType<Record<string, unknown>>;

const PreviewFrameComponent =
  PreviewFrameComposition as unknown as React.ComponentType<Record<string, unknown>>;

const NewsBulletinComponent =
  NewsBulletinComposition as unknown as React.ComponentType<Record<string, unknown>>;

const NewsBulletinTestComponent =
  NewsBulletinStyleTestComposition as unknown as React.ComponentType<Record<string, unknown>>;

const ProductReviewComponent =
  ProductReviewComposition as unknown as React.ComponentType<Record<string, unknown>>;

const ProductReviewPreviewComponent =
  ProductReviewPreviewFrame as unknown as React.ComponentType<Record<string, unknown>>;

const ProductReviewMiniComponent =
  ProductReviewMini as unknown as React.ComponentType<Record<string, unknown>>;

// 9 test stil ID listesi
const BULLETIN_TEST_STYLES: BulletinStyle[] = [
  "breaking", "tech", "corporate", "sport", "finance",
  "weather", "science", "entertainment", "dark",
];

// ---------------------------------------------------------------------------
// StandardVideo defaultProps
// ---------------------------------------------------------------------------

const defaultStandardVideoProps: StandardVideoProps = {
  title: "",
  scenes: [],
  subtitles_srt: null,
  wordTimings: [],
  timing_mode: "cursor",
  subtitle_style: {
    preset_id: "clean_white",
    label: "Clean White",
    font_size: 48,
    font_weight: "600",
    text_color: "#ffffff",
    active_color: "#ffdd00",
    background: "rgba(0,0,0,0.5)",
    outline_width: 0,
    outline_color: "#000000",
    line_height: 1.4,
  },
  total_duration_seconds: 60,
  language: "tr",
  metadata: {
    title: "",
    description: "",
    tags: [],
    hashtags: [],
  },
};

// ---------------------------------------------------------------------------
// PreviewFrame defaultProps
// ---------------------------------------------------------------------------

const defaultPreviewFrameProps: PreviewFrameProps = {
  scene_number: 1,
  image_path: null,
  subtitle_style: defaultStandardVideoProps.subtitle_style,
  sample_text: "Önizleme",
};

// ---------------------------------------------------------------------------
// ProductReview defaultProps (Faz C)
// ---------------------------------------------------------------------------

const defaultProductReviewBlueprint = {
  blueprint_id: "product_review_v1",
  version: 1,
  tone: "electric",
  accentOverride: null,
  showWatermark: false,
  watermarkText: null,
  showPriceDisclaimerOverlay: true,
  priceDisclaimerText: "Fiyatlar video kayit anina aittir; degisebilir.",
};

const defaultProductReviewProps: ProductReviewProps = {
  template_type: "single",
  orientation: "vertical",
  language: "tr",
  duration_seconds: 60,
  scenes: [
    { scene_id: "s1", scene_key: "intro_hook", duration_ms: 4000 },
    { scene_id: "s2", scene_key: "hero_card", duration_ms: 8000 },
    { scene_id: "s3", scene_key: "price_reveal", duration_ms: 5000 },
    { scene_id: "s4", scene_key: "feature_callout", duration_ms: 5000 },
    { scene_id: "s5", scene_key: "pros_cons", duration_ms: 8000 },
    { scene_id: "s6", scene_key: "verdict_card", duration_ms: 6000 },
    { scene_id: "s7", scene_key: "cta_outro", duration_ms: 4000 },
  ],
  products: [
    {
      product_id: "DEMO-1",
      name: "Demo Product",
      brand: "ContentHub",
      price: null,
      currency: "TRY",
      image_url: null,
    },
  ],
  primary_product_id: "DEMO-1",
  secondary_product_ids: [],
  metadata: {
    title: "Demo Product Review",
    description: "",
    tags: [],
    legal: {
      disclosure_applied: true,
      disclosure_source: "default_tr",
      disclaimer_applied: true,
      affiliate_enabled: false,
      affiliate_url_included: false,
      tos_checkbox_required: true,
    },
  },
  visuals: {
    primary_image_url: "",
    secondary_image_urls: [],
    fallback_bg_color: "#050818",
  },
  blueprint: defaultProductReviewBlueprint,
};

const defaultProductReviewPreviewProps: ProductReviewPreviewFrameProps = {
  scene_key: "hero_card",
  scene_duration_ms: 1000,
  products: defaultProductReviewProps.products,
  primary_product_id: defaultProductReviewProps.primary_product_id,
  secondary_product_ids: [],
  metadata: defaultProductReviewProps.metadata,
  orientation: "vertical",
  language: "tr",
  blueprint: defaultProductReviewBlueprint,
  visuals: defaultProductReviewProps.visuals,
};

const defaultProductReviewMiniProps: ProductReviewMiniProps = {
  ...defaultProductReviewProps,
  duration_seconds: 10,
  scenes: [
    { scene_id: "s1", scene_key: "intro_hook", duration_ms: 2500 },
    { scene_id: "s2", scene_key: "hero_card", duration_ms: 3500 },
    { scene_id: "s3", scene_key: "price_reveal", duration_ms: 2500 },
    { scene_id: "s4", scene_key: "cta_outro", duration_ms: 1500 },
  ],
};

// ---------------------------------------------------------------------------
// Root bileşeni
// ---------------------------------------------------------------------------

export function RemotionRoot() {
  return (
    <>
      {/* Final render composition */}
      <Composition
        id="StandardVideo"
        component={StandardVideoComponent}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={
          defaultStandardVideoProps as unknown as Record<string, unknown>
        }
        calculateMetadata={async ({ props }) => {
          const typed = props as unknown as StandardVideoProps;
          const raw = typed.total_duration_seconds;
          const FALLBACK_SECS = 60;
          let totalSecs: number;
          if (typeof raw !== "number" || raw <= 0) {
            console.warn(
              `[Root.tsx] total_duration_seconds geçersiz (${raw}). ` +
              `Fallback=${FALLBACK_SECS}s kullanılıyor.`
            );
            totalSecs = FALLBACK_SECS;
          } else {
            totalSecs = raw;
          }
          // A6: renderFps prop'tan oku — yoksa global FPS sabiti
          const activeFps =
            typeof typed.renderFps === "number" && typed.renderFps >= 15 && typed.renderFps <= 60
              ? typed.renderFps
              : FPS;
          // Duration hesabı — composition layout ile senkron olmalı
          const hasScenes = Array.isArray(typed.scenes) && typed.scenes.length > 0;
          const sceneCount = hasScenes ? typed.scenes.length : 0;
          const transSec = typeof typed.sceneTransitionDuration === "number" ? typed.sceneTransitionDuration : 0.5;
          const trFrames = Math.max(1, Math.round(transSec * activeFps));
          // B4: introDuration/outroDuration prop'larından oku — yoksa 2.5s
          const INTRO_SEC = typeof typed.introDuration === "number" ? typed.introDuration : 2.5;
          const OUTRO_SEC = typeof typed.outroDuration === "number" ? typed.outroDuration : 2.5;
          const hasIntro = hasScenes && !!typed.title;
          const hasOutro = hasScenes && !!(typed.watermarkText || typed.title);
          const introFrames = hasIntro ? Math.round(INTRO_SEC * activeFps) : 0;
          const outroFrames = hasOutro ? Math.round(OUTRO_SEC * activeFps) : 0;
          // total_content_frames - scene_overlaps + intro_net + outro_net
          const totalContentFrames = Math.round(totalSecs * activeFps);
          const sceneOverlaps = sceneCount > 1 ? (sceneCount - 1) * trFrames : 0;
          const introNet = hasIntro ? introFrames - trFrames : 0;
          const outroNet = hasOutro ? outroFrames - trFrames : 0;
          const durationInFrames = Math.max(1, totalContentFrames - sceneOverlaps + introNet + outroNet);
          // M41: 9:16 portrait desteği
          const isPortrait = typed.renderFormat === "portrait";
          return {
            durationInFrames,
            fps: activeFps,
            width: isPortrait ? 1080 : 1920,
            height: isPortrait ? 1920 : 1080,
          };
        }}
      />

      {/* News Bulletin combined render composition (M28) */}
      <Composition
        id="NewsBulletin"
        component={NewsBulletinComponent}
        durationInFrames={FPS * 120}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={
          defaultNewsBulletinProps as unknown as Record<string, unknown>
        }
        calculateMetadata={async ({ props }) => {
          const typed = props as unknown as NewsBulletinProps;
          const raw = typed.totalDurationSeconds;
          const FALLBACK_SECS = 120;
          let totalSecs: number;
          if (typeof raw !== "number" || raw <= 0) {
            console.warn(
              `[Root.tsx] NewsBulletin totalDurationSeconds gecersiz (${raw}). ` +
              `Fallback=${FALLBACK_SECS}s kullaniliyor.`
            );
            totalSecs = FALLBACK_SECS;
          } else {
            totalSecs = raw + 2;
          }
          const durationInFrames = Math.max(1, Math.round(totalSecs * FPS));
          // M41: 9:16 portrait desteği
          const isPortrait = typed.renderFormat === "portrait";
          return {
            durationInFrames,
            width: isPortrait ? 1080 : 1920,
            height: isPortrait ? 1920 : 1080,
          };
        }}
      />

      {/* Preview composition — renderStill için, final render'dan ayrı */}
      <Composition
        id="PreviewFrame"
        component={PreviewFrameComponent}
        durationInFrames={1}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={
          defaultPreviewFrameProps as unknown as Record<string, unknown>
        }
      />

      {/* ProductReview — final render composition (Faz C) */}
      <Composition
        id="ProductReview"
        component={ProductReviewComponent}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={
          defaultProductReviewProps as unknown as Record<string, unknown>
        }
        calculateMetadata={async ({ props }) => {
          const typed = props as unknown as ProductReviewProps;
          const rawSeconds = typed.duration_seconds;
          const FALLBACK = 60;
          const totalSeconds =
            typeof rawSeconds === "number" && rawSeconds > 0 ? rawSeconds : FALLBACK;
          // Scene toplamini da hesaba kat — en az uygun frame sayisini ver
          const sceneMs = (typed.scenes || []).reduce(
            (acc, s) => acc + (typeof s.duration_ms === "number" && s.duration_ms > 0 ? s.duration_ms : 0),
            0,
          );
          const sceneSeconds = sceneMs / 1000;
          const effectiveSeconds = Math.max(totalSeconds, sceneSeconds || totalSeconds);
          const isVertical = typed.orientation !== "horizontal";
          return {
            durationInFrames: Math.max(1, Math.round(effectiveSeconds * FPS)),
            fps: FPS,
            width: isVertical ? 1080 : 1920,
            height: isVertical ? 1920 : 1080,
          };
        }}
      />

      {/* ProductReviewPreviewFrame — renderStill L1 (Faz C) */}
      <Composition
        id="ProductReviewPreviewFrame"
        component={ProductReviewPreviewComponent}
        durationInFrames={1}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={
          defaultProductReviewPreviewProps as unknown as Record<string, unknown>
        }
        calculateMetadata={async ({ props }) => {
          const typed = props as unknown as ProductReviewPreviewFrameProps;
          const isVertical = typed.orientation !== "horizontal";
          return {
            durationInFrames: 1,
            fps: FPS,
            width: isVertical ? 1080 : 1920,
            height: isVertical ? 1920 : 1080,
          };
        }}
      />

      {/* ProductReviewMini — L2 kisa MP4 (Faz C) */}
      <Composition
        id="ProductReviewMini"
        component={ProductReviewMiniComponent}
        durationInFrames={FPS * 10}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={
          defaultProductReviewMiniProps as unknown as Record<string, unknown>
        }
        calculateMetadata={async ({ props }) => {
          const typed = props as unknown as ProductReviewMiniProps;
          const rawSeconds = typed.duration_seconds;
          const FALLBACK = 10;
          const totalSeconds =
            typeof rawSeconds === "number" && rawSeconds > 0 ? rawSeconds : FALLBACK;
          const sceneMs = (typed.scenes || []).reduce(
            (acc, s) => acc + (typeof s.duration_ms === "number" && s.duration_ms > 0 ? s.duration_ms : 0),
            0,
          );
          const sceneSeconds = sceneMs / 1000;
          const effectiveSeconds = Math.max(totalSeconds, sceneSeconds || totalSeconds);
          const isVertical = typed.orientation !== "horizontal";
          return {
            durationInFrames: Math.max(1, Math.round(effectiveSeconds * FPS)),
            fps: FPS,
            width: isVertical ? 1080 : 1920,
            height: isVertical ? 1920 : 1080,
          };
        }}
      />

      {/* ── Stil Test Composition'ları (9 stil × 16:9) ─────────────────────
          Remotion Studio'da "NewsBulletin_Test_*" adıyla görünür.
          Production render'da kullanılmaz — sadece görsel test içindir.
      ──────────────────────────────────────────────────────────────────── */}
      {BULLETIN_TEST_STYLES.map((style) => {
        const testProps = TEST_PROPS[style];
        const totalSecs = testProps.totalDurationSeconds + 2;
        const durationInFrames = Math.max(1, Math.round(totalSecs * FPS));
        return (
          <Composition
            key={`test_${style}`}
            id={`NewsBulletinTest-${style}`}
            component={NewsBulletinTestComponent}
            durationInFrames={durationInFrames}
            fps={FPS}
            width={1920}
            height={1080}
            defaultProps={testProps as unknown as Record<string, unknown>}
          />
        );
      })}
    </>
  );
}

registerRoot(RemotionRoot);
