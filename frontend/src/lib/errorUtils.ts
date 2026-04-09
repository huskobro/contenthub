/**
 * Error classification and user-friendly message mapping — Sprint 2.
 *
 * Differentiates API errors by HTTP status code and provides
 * localized user-facing messages for the Turkish UI.
 */

import { ApiError } from "../api/client";

export type ErrorCategory =
  | "auth"           // 401 — session expired or not authenticated
  | "forbidden"      // 403 — insufficient permissions
  | "not_found"      // 404 — resource not found
  | "conflict"       // 409 — state conflict / invalid transition
  | "validation"     // 422 — input validation failure
  | "provider"       // 503 — external provider or config unavailable
  | "system";        // 500+ — unexpected server error

export interface ClassifiedError {
  category: ErrorCategory;
  title: string;
  message: string;
  retryable: boolean;
  status?: number;
}

export function classifyError(error: unknown): ClassifiedError {
  if (error instanceof ApiError) {
    const detail = error.detail || error.message;
    switch (error.status) {
      case 401:
        return {
          category: "auth",
          title: "Oturum süresi doldu",
          message: "Lütfen tekrar giriş yapın.",
          retryable: false,
          status: 401,
        };
      case 403:
        return {
          category: "forbidden",
          title: "Yetki hatası",
          message: detail || "Bu işlem için yetkiniz yok.",
          retryable: false,
          status: 403,
        };
      case 404:
        return {
          category: "not_found",
          title: "Bulunamadı",
          message: detail || "İstenen kaynak bulunamadı.",
          retryable: false,
          status: 404,
        };
      case 409:
        return {
          category: "conflict",
          title: "İşlem çakışması",
          message: detail || "Bu işlem mevcut durumla çelişiyor.",
          retryable: false,
          status: 409,
        };
      case 422:
        return {
          category: "validation",
          title: "Geçersiz veri",
          message: detail || "Girilen bilgilerde hata var.",
          retryable: false,
          status: 422,
        };
      case 503:
        return {
          category: "provider",
          title: "Servis kullanılamıyor",
          message: detail || "Dış servis veya yapılandırma şu an kullanılamıyor.",
          retryable: true,
          status: 503,
        };
      default:
        if (error.status >= 500) {
          return {
            category: "system",
            title: "Sistem hatası",
            message: detail || "Beklenmeyen bir hata oluştu.",
            retryable: true,
            status: error.status,
          };
        }
        return {
          category: "system",
          title: "Hata",
          message: detail || `HTTP ${error.status}`,
          retryable: false,
          status: error.status,
        };
    }
  }

  // Non-API errors (network, etc.)
  if (error instanceof Error) {
    if (error.message.includes("fetch") || error.message.includes("network") || error.message.includes("Failed to fetch")) {
      return {
        category: "system",
        title: "Bağlantı hatası",
        message: "Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.",
        retryable: true,
      };
    }
    return {
      category: "system",
      title: "Hata",
      message: error.message,
      retryable: false,
    };
  }

  return {
    category: "system",
    title: "Bilinmeyen hata",
    message: "Beklenmeyen bir hata oluştu.",
    retryable: false,
  };
}

/**
 * Map error to toast type for useToast() calls.
 */
export function errorToToastType(classified: ClassifiedError): "error" | "warning" {
  if (classified.category === "provider" || classified.retryable) return "warning";
  return "error";
}
