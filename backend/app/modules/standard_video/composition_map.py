"""
Güvenli composition kimlik eşleştirmesi — M6-C3.

AI tarafından dinamik render kodu üretilemez (CLAUDE.md C-07).
Composition ID'ler burada açık olarak tanımlanır.
Yeni bir composition eklendiğinde bu dosya güncellenmeli ve kod incelemesinden geçmelidir.

Composition tipleri:
  final   — tam video render (renderMedia). Örn: StandardVideo
  preview — tek kare renderStill. Örn: PreviewFrame

Bu ayrım tipte değil, kullanım sözleşmesinde yaşar:
  - "final" composition'lar RenderStepExecutor tarafından çağrılır.
  - "preview" composition'lar RenderStillExecutor tarafından çağrılır.
  - Bir executor yanlış tip composition'ı çağırmamalıdır.

Senkron kuralı (değişmez):
  renderer/src/Root.tsx içindeki her Composition id'si bu sözlükte olmalıdır.
  Bu dosya backend'in tek otoriter composition kaydıdır.
  Root.tsx ile bu dosya arasındaki her farklılık bir drift hatasıdır.
"""

# Modül kimliği → Remotion composition kimliği eşleştirmesi (final render)
# Yeni modül eklemek için bu sözlüğe açık kayıt yapılmalıdır.
COMPOSITION_MAP: dict[str, str] = {
    "standard_video": "StandardVideo",
}

# Preview composition kimlik eşleştirmesi (renderStill)
# Key: preview bağlamı, Value: Remotion composition ID
# Yeni preview composition eklemek için bu sözlüğe açık kayıt yapılmalıdır.
PREVIEW_COMPOSITION_MAP: dict[str, str] = {
    "standard_video_preview": "PreviewFrame",
}


def get_composition_id(module_id: str) -> str:
    """
    module_id için Remotion final render composition ID'sini döner.

    Bilinmeyen modül kimliği → ValueError fırlatır.
    Dinamik veya AI üretimli composition ID'lere izin verilmez.

    Args:
        module_id: İçerik modülünün kimliği (örn. 'standard_video').

    Returns:
        Remotion composition kimliği (örn. 'StandardVideo').

    Raises:
        ValueError: module_id COMPOSITION_MAP içinde tanımlı değilse.
    """
    if module_id not in COMPOSITION_MAP:
        raise ValueError(
            f"Bilinmeyen modül için composition tanımlı değil: {module_id}. "
            f"Desteklenen modüller: {list(COMPOSITION_MAP.keys())}"
        )
    return COMPOSITION_MAP[module_id]


def get_preview_composition_id(preview_context: str) -> str:
    """
    preview_context için Remotion renderStill composition ID'sini döner.

    Bilinmeyen preview bağlamı → ValueError fırlatır.
    Bu fonksiyon yalnızca RenderStillExecutor tarafından çağrılmalıdır.

    Args:
        preview_context: Preview bağlamı (örn. 'standard_video_preview').

    Returns:
        Remotion preview composition kimliği (örn. 'PreviewFrame').

    Raises:
        ValueError: preview_context PREVIEW_COMPOSITION_MAP içinde tanımlı değilse.
    """
    if preview_context not in PREVIEW_COMPOSITION_MAP:
        raise ValueError(
            f"Bilinmeyen preview bağlamı için composition tanımlı değil: {preview_context}. "
            f"Desteklenen bağlamlar: {list(PREVIEW_COMPOSITION_MAP.keys())}"
        )
    return PREVIEW_COMPOSITION_MAP[preview_context]


def get_all_composition_ids() -> list[str]:
    """
    Tüm kayıtlı composition ID'lerini döner (final + preview).

    Root.tsx doğrulama ve test amaçlıdır.
    """
    return list(COMPOSITION_MAP.values()) + list(PREVIEW_COMPOSITION_MAP.values())
