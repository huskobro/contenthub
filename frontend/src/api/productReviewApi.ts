/**
 * Product Review API client — PHASE AE.
 *
 * Backend router prefix: `/api/v1/product-review`
 * Covers: product CRUD, scrape trigger, review CRUD, start-production,
 * publish-record creation.
 */

import { api } from "./client";

const BASE = "/api/v1/product-review";

// ---------------------------------------------------------------------------
// Product types
// ---------------------------------------------------------------------------

export interface ProductResponse {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  vendor: string | null;
  source_url: string;
  canonical_url: string | null;
  affiliate_url: string | null;
  current_price: number | null;
  currency: string | null;
  description: string | null;
  primary_image_url: string | null;
  parser_source: string | null;
  scrape_confidence: number | null;
  robots_txt_allowed: boolean | null;
  is_test_data: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  items: ProductResponse[];
  total: number;
  offset: number;
  limit: number;
}

export interface ProductCreate {
  source_url: string;
  name?: string;
  brand?: string;
  category?: string;
  vendor?: string;
  affiliate_url?: string;
  is_test_data?: boolean;
}

export interface ProductScrapeTriggerResponse {
  status: "ok" | "failed";
  product_id: string;
  parser_source?: string | null;
  confidence?: number | null;
  price?: number | null;
  currency?: string | null;
  primary_image_url?: string | null;
  name?: string | null;
  snapshot_id?: string | null;
  snapshot_created?: boolean | null;
  error?: string | null;
}

// ---------------------------------------------------------------------------
// ProductReview types
// ---------------------------------------------------------------------------

export type ProductReviewTemplateType =
  | "single"
  | "comparison"
  | "alternatives";
export type ProductReviewRunMode = "semi_auto" | "full_auto";
export type ProductReviewOrientation = "vertical" | "horizontal";

export interface ProductReviewCreate {
  topic: string;
  template_type: ProductReviewTemplateType;
  primary_product_id: string;
  secondary_product_ids?: string[];
  language?: string;
  orientation?: ProductReviewOrientation;
  duration_seconds?: number;
  run_mode?: ProductReviewRunMode;
  affiliate_enabled?: boolean;
  disclosure_text?: string;
  is_test_data?: boolean;
}

export interface ProductReviewResponse {
  id: string;
  topic: string;
  template_type: string;
  primary_product_id: string;
  secondary_product_ids_json: string;
  language: string;
  orientation: string;
  duration_seconds: number;
  run_mode: string;
  affiliate_enabled: boolean;
  disclosure_text: string | null;
  job_id: string | null;
  owner_user_id: string | null;
  is_test_data: boolean;
  created_at: string;
  updated_at: string;
}

export interface StartProductionRequest {
  content_project_id?: string;
  channel_profile_id?: string;
}

export interface StartProductionResponse {
  job_id: string;
  review_id: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Product endpoints
// ---------------------------------------------------------------------------

export function createProduct(data: ProductCreate): Promise<ProductResponse> {
  return api.post<ProductResponse>(`${BASE}/products`, data);
}

export function listProducts(params?: {
  search?: string;
  include_test_data?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ProductListResponse> {
  return api.get<ProductListResponse>(`${BASE}/products`, params);
}

export function getProduct(productId: string): Promise<ProductResponse> {
  return api.get<ProductResponse>(`${BASE}/products/${productId}`);
}

export function triggerProductScrape(
  productId: string,
): Promise<ProductScrapeTriggerResponse> {
  return api.post<ProductScrapeTriggerResponse>(
    `${BASE}/products/${productId}/scrape`,
  );
}

// ---------------------------------------------------------------------------
// ProductReview endpoints
// ---------------------------------------------------------------------------

export function createProductReview(
  data: ProductReviewCreate,
): Promise<ProductReviewResponse> {
  return api.post<ProductReviewResponse>(`${BASE}/product-reviews`, data);
}

export function listProductReviews(params?: {
  template_type?: string;
  include_test_data?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ProductReviewResponse[]> {
  return api.get<ProductReviewResponse[]>(
    `${BASE}/product-reviews`,
    params,
  );
}

export function getProductReview(
  reviewId: string,
): Promise<ProductReviewResponse> {
  return api.get<ProductReviewResponse>(`${BASE}/product-reviews/${reviewId}`);
}

export function startProductReviewProduction(
  reviewId: string,
  body: StartProductionRequest = {},
): Promise<StartProductionResponse> {
  return api.post<StartProductionResponse>(
    `${BASE}/product-reviews/${reviewId}/start-production`,
    body,
  );
}
