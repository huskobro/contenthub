/**
 * Gate 4 (Z-5) — Triage chip for failed publishes.
 *
 * Renders a small color-coded chip mapping `last_error_category` to an
 * operator-friendly label. When `null` (no failure recorded) the chip
 * renders nothing.
 */

const CATEGORY_STYLES: Record<
  string,
  { bg: string; border: string; text: string; label: string; tip: string }
> = {
  token_error: {
    bg: "bg-error/10",
    border: "border-error/30",
    text: "text-error",
    label: "Token",
    tip: "OAuth/refresh hatası — bağlantıyı yenileyin.",
  },
  quota_exceeded: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
    label: "Kota",
    tip: "Platform kotası doldu — sonraki kota dönemini bekleyin.",
  },
  network: {
    bg: "bg-info/10",
    border: "border-info/30",
    text: "text-info",
    label: "Ağ",
    tip: "Geçici ağ hatası — tekrar deneyin.",
  },
  validation: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
    label: "Doğrulama",
    tip: "Yayın payload'unda geçersiz alan — düzeltip tekrar gönderin.",
  },
  permission: {
    bg: "bg-error/10",
    border: "border-error/30",
    text: "text-error",
    label: "İzin",
    tip: "Scope/yetki yetersiz — bağlantı kapsamını genişletin.",
  },
  asset_missing: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    text: "text-warning",
    label: "Asset",
    tip: "Render artefaktı bulunamadı — pipeline'ı tekrar çalıştırın.",
  },
  unknown: {
    bg: "bg-neutral-200",
    border: "border-neutral-300",
    text: "text-neutral-700",
    label: "Bilinmiyor",
    tip: "Sınıflandırılamayan hata — log/trace inceleyin.",
  },
};

interface PublishErrorChipProps {
  category: string | null | undefined;
  /** Optional last_error message to use as tooltip override. */
  message?: string | null;
  className?: string;
}

export function PublishErrorChip({
  category,
  message,
  className = "",
}: PublishErrorChipProps) {
  if (!category) return null;
  const style = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.unknown;
  return (
    <span
      className={
        `inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-xs ` +
        `${style.bg} ${style.border} ${style.text} ${className}`
      }
      title={message ? `${style.tip}\n\n${message}` : style.tip}
      data-testid="publish-error-chip"
      data-category={category}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {style.label}
    </span>
  );
}
