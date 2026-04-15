/**
 * product_review composition/scene prop types.
 *
 * Kaynak: backend composition executor -> composition_props.json
 * Renderer saf React; fs okuma yok, tum veri props olarak gelir.
 */

import type { ProductReviewTone } from "./palette";

export type ProductReviewTemplate =
  | "single"
  | "comparison"
  | "alternatives";

export type ProductReviewOrientation = "vertical" | "horizontal";

export interface ProductItem {
  product_id: string;
  name: string;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  image_url?: string | null;
  rating_value?: number | null;
  rating_count?: number | null;
  availability?: string | null;
  source_url?: string | null;
  affiliate_url?: string | null;
  pros?: string[] | null;
  cons?: string[] | null;
  features?: string[] | null;
  specs?: Array<{ label: string; value: string }> | null;
  verdict?: string | null;
  score?: number | null;           // 0-100
  parser_source?: string | null;
  confidence?: number | null;
}

export type ProductReviewSceneKey =
  | "intro_hook"
  | "hero_card"
  | "price_reveal"
  | "feature_callout"
  | "spec_grid"
  | "comparison_row"
  | "social_proof"
  | "pros_cons"
  | "verdict_card"
  | "cta_outro";

export interface ProductReviewScene {
  scene_id: string;
  scene_key: ProductReviewSceneKey;
  duration_ms: number;
  narration?: string | null;
  visual_hint?: string | null;
  product_refs?: string[] | null;   // which product_ids this scene features
  extras?: Record<string, unknown> | null;
}

export interface ProductReviewMetadataBlock {
  title: string;
  description: string;
  tags?: string[] | null;
  legal?: {
    disclosure_applied: boolean;
    disclosure_source?: string;
    disclaimer_applied: boolean;
    affiliate_enabled: boolean;
    affiliate_url_included: boolean;
    tos_checkbox_required: boolean;
  } | null;
}

export interface ProductReviewStyleBlueprint {
  blueprint_id?: string | null;
  version?: number | null;
  tone?: ProductReviewTone | string | null;
  // Renderer kendi default'larini devralir; backend blueprint override edebilir.
  accentOverride?: string | null;
  showWatermark?: boolean;
  watermarkText?: string | null;
  showPriceDisclaimerOverlay?: boolean;
  priceDisclaimerText?: string | null;
}

export interface ProductReviewProps {
  template_type: ProductReviewTemplate;
  orientation: ProductReviewOrientation;
  language: "tr" | "en";
  duration_seconds: number;
  scenes: ProductReviewScene[];
  products: ProductItem[];
  primary_product_id: string;
  secondary_product_ids?: string[] | null;
  metadata: ProductReviewMetadataBlock;
  visuals: {
    primary_image_url: string;
    secondary_image_urls?: string[] | null;
    fallback_bg_color?: string | null;
  };
  blueprint: ProductReviewStyleBlueprint;
}

export interface SceneComponentProps {
  scene: ProductReviewScene;
  products: ProductItem[];
  primaryProduct: ProductItem;
  secondaryProducts: ProductItem[];
  metadata: ProductReviewMetadataBlock;
  orientation: ProductReviewOrientation;
  language: "tr" | "en";
  blueprint: ProductReviewStyleBlueprint;
  sceneDurationFrames: number;
}
