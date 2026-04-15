/**
 * ProductReviewMini — Faz C Level 2 preview (kisa MP4).
 *
 * Final render ile ayni sahne katalogunu kullanir; backend kisa bir scene
 * listesi uretir (ornek: intro_hook -> hero_card -> price_reveal -> cta).
 * Boylece "izleme deneyimi" yakalanir ama render maliyeti dusuk kalir.
 *
 * Sozlesme:
 *   - Backend ProductReviewPreviewMiniExecutor composition_props.json yazar,
 *     icindeki `props` alani full ProductReviewProps seklindedir (ayni shape).
 *   - calculateMetadata Root.tsx icinde; toplam sure props.duration_seconds
 *     uzerinden hesaplanir, fallback 10 saniye.
 */

import React from "react";
import { ProductReviewComposition, ProductReviewProps } from "./ProductReviewComposition";

export type ProductReviewMiniProps = ProductReviewProps;

export function ProductReviewMini(props: ProductReviewMiniProps): JSX.Element {
  return <ProductReviewComposition {...props} />;
}
