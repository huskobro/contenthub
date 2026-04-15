/**
 * ProductReviewPreviewFrame — Faz C Level 1 preview (renderStill).
 *
 * Tek kare JPEG/PNG uretir. Composition_map anahtari:
 *   PREVIEW_COMPOSITION_MAP["product_review_preview"] = "ProductReviewPreviewFrame"
 *
 * Final render'dan BAGIMSIZ bir yol — sahne bilesenlerini tekrar kullanir,
 * sadece bir sahne render eder.
 */

import React from "react";
import { ProductReviewSingleScene, ProductReviewSingleSceneProps } from "./ProductReviewComposition";

export type ProductReviewPreviewFrameProps = ProductReviewSingleSceneProps;

export function ProductReviewPreviewFrame(props: ProductReviewPreviewFrameProps): JSX.Element {
  return <ProductReviewSingleScene {...props} />;
}
