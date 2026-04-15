/**
 * ProductReview composition bileseni — Faz C.
 *
 * Backend ProductReviewCompositionStepExecutor composition_props.json yazar,
 * RenderStepExecutor props injection yapar; biz saf React Sequence seklinde
 * sahneleri arka arkaya render ederiz.
 *
 * Style blueprint (product_review_v1) tone + watermark + price disclaimer
 * overlay'i scene_components icinde kullanir.
 *
 * Vertical + horizontal: orientation prop'undan karar verilir; width/height
 * calculateMetadata tarafindan ayarlanir (Root.tsx).
 */

import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { renderScene } from "../templates/product-review/components/scenes";
import type {
  ProductReviewProps,
  ProductItem,
  ProductReviewScene,
} from "../templates/product-review/shared/types";

export type { ProductReviewProps } from "../templates/product-review/shared/types";

function findProduct(products: ProductItem[], id: string | null | undefined): ProductItem | null {
  if (!id) return null;
  return products.find((p) => p.product_id === id) ?? null;
}

export function ProductReviewComposition(props: ProductReviewProps): JSX.Element {
  const { fps } = useVideoConfig();
  const {
    scenes,
    products,
    primary_product_id,
    secondary_product_ids,
    metadata,
    orientation,
    language,
    blueprint,
    visuals,
  } = props;

  const primary = findProduct(products, primary_product_id) ?? products[0];
  if (!primary) {
    return (
      <AbsoluteFill
        style={{
          background: visuals?.fallback_bg_color || "#111111",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          fontFamily: "Inter, sans-serif",
        }}
      >
        Product data missing
      </AbsoluteFill>
    );
  }
  const secondary: ProductItem[] = (secondary_product_ids || [])
    .map((id) => findProduct(products, id))
    .filter((x): x is ProductItem => !!x);

  let cursorFrames = 0;
  const sequences: JSX.Element[] = [];
  (scenes || []).forEach((scene: ProductReviewScene, idx: number) => {
    const durMs = typeof scene.duration_ms === "number" && scene.duration_ms > 0
      ? scene.duration_ms
      : 3000;
    const frames = Math.max(1, Math.round((durMs / 1000) * fps));
    sequences.push(
      <Sequence
        from={cursorFrames}
        durationInFrames={frames}
        key={`${scene.scene_id || scene.scene_key}-${idx}`}
        layout="none"
      >
        {renderScene(scene.scene_key, {
          scene,
          products,
          primaryProduct: primary,
          secondaryProducts: secondary,
          metadata,
          orientation,
          language,
          blueprint,
          sceneDurationFrames: frames,
        })}
      </Sequence>,
    );
    cursorFrames += frames;
  });

  return <AbsoluteFill>{sequences}</AbsoluteFill>;
}

// Preview-only single-scene version (used by Preview executors).
export interface ProductReviewSingleSceneProps {
  scene_key: ProductReviewScene["scene_key"];
  scene_duration_ms: number;
  products: ProductItem[];
  primary_product_id: string;
  secondary_product_ids?: string[] | null;
  metadata: ProductReviewProps["metadata"];
  orientation: ProductReviewProps["orientation"];
  language: ProductReviewProps["language"];
  blueprint: ProductReviewProps["blueprint"];
  visuals?: ProductReviewProps["visuals"] | null;
}

export function ProductReviewSingleScene(props: ProductReviewSingleSceneProps): JSX.Element {
  const { fps } = useVideoConfig();
  const primary = findProduct(props.products, props.primary_product_id) ?? props.products[0];
  if (!primary) {
    return (
      <AbsoluteFill style={{ background: "#111", color: "#fff" }}>
        Product data missing
      </AbsoluteFill>
    );
  }
  const secondary: ProductItem[] = (props.secondary_product_ids || [])
    .map((id) => findProduct(props.products, id))
    .filter((x): x is ProductItem => !!x);
  const frames = Math.max(1, Math.round((props.scene_duration_ms / 1000) * fps));
  return (
    <AbsoluteFill>
      {renderScene(props.scene_key, {
        scene: {
          scene_id: `preview_${props.scene_key}`,
          scene_key: props.scene_key,
          duration_ms: props.scene_duration_ms,
        },
        products: props.products,
        primaryProduct: primary,
        secondaryProducts: secondary,
        metadata: props.metadata,
        orientation: props.orientation,
        language: props.language,
        blueprint: props.blueprint,
        sceneDurationFrames: frames,
      })}
    </AbsoluteFill>
  );
}
